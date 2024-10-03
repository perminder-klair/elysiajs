import { Elysia, t } from 'elysia';
import Bun from 'bun';

export const userService = new Elysia({ name: 'user/service' })
  .state({
    user: {} as Record<string, string>,
    session: {} as Record<number, string>,
  })
  .model({
    signIn: t.Object({
      username: t.String({ minLength: 1 }),
      password: t.String({ minLength: 8 }),
    }),
    session: t.Cookie(
      {
        token: t.Number(),
      },
      {
        secrets: 'seia',
      }
    ),
  })
  .model((model) => ({
    ...model,
    optionalSession: t.Optional(model.session),
  }))
  .macro(({ onBeforeHandle }) => ({
    isSignIn(enabled: true) {
      if (!enabled) return;

      onBeforeHandle(({ error, cookie: { token }, store: { session } }) => {
        if (!token.value)
          return error(401, {
            success: false,
            message: 'Unauthorized',
          });

        const username = session[token.value as unknown as number];

        if (!username)
          return error(401, {
            success: false,
            message: 'Unauthorized',
          });
      });
    },
  }));

export const getUserId = new Elysia()
  .use(userService)
  .guard({
    as: 'scoped',
    isSignIn: true,
    cookie: 'session',
  })
  .resolve({ as: 'scoped' }, ({ store: { session }, cookie: { token } }) => ({
    username: session[token.value],
  }));

export const user = new Elysia({ prefix: '/user' })
  .use(userService)
  .put(
    '/sign-up',
    async ({ body: { username, password }, store, error }) => {
      if (store.user[username])
        return error(400, {
          success: false,
          message: 'User already exists',
        });

      store.user[username] = await Bun.password.hash(password);

      return {
        success: true,
        message: 'User created',
      };
    },
    {
      body: 'signIn',
    }
  )
  .post(
    '/sign-in',
    async ({
      store: { user, session },
      error,
      body: { username, password },
      cookie: { token },
    }) => {
      if (
        !user[username] ||
        !(await Bun.password.verify(password, user[username]))
      )
        return error(400, {
          success: false,
          message: 'Invalid username or password',
        });

      const key = crypto.getRandomValues(new Uint32Array(1))[0];
      session[key] = username;
      token.value = key;

      return {
        success: true,
        message: `Signed in as ${username}`,
      };
    },
    {
      body: 'signIn',
      cookie: 'session',
    }
  )
  .get(
    '/sign-out',
    ({ cookie: { token } }) => {
      token.remove();

      return {
        success: true,
        messaage: 'Signed out',
      };
    },
    {
      cookie: 'optionalSession',
    }
  )
  .get(
    '/profile',
    ({ cookie: { token }, store: { user, session }, error }) => {
      const username = session[token.value];

      return {
        success: true,
        username,
      };
    },
    { isSignIn: true, cookie: 'session' }
  );
