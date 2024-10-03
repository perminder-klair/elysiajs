import { Elysia, t } from 'elysia';
import { getUserId, userService } from './user';

const memo = t.Object({
  data: t.String(),
  author: t.String(),
});

type Memo = typeof memo.static;

class Note {
  constructor(
    public data: Memo[] = [
      {
        data: 'Moonhalo',
        author: 'saltyaom',
      },
    ]
  ) {}

  add(note: Memo) {
    this.data.push(note);

    return this.data;
  }

  remove(index: number) {
    return this.data.splice(index, 1);
  }

  update(index: number, note: Partial<Memo>) {
    return (this.data[index] = { ...this.data[index], ...note });
  }
}

export const note = new Elysia({ prefix: '/note' })
  .use(userService)
  .decorate('note', new Note())
  .model({
    memo: t.Omit(memo, ['author']),
  })
  // intercept request before/after it is processed for logging
  .onTransform(function log({ body, params, path, request: { method } }) {
    console.log(`${method} ${path}`, {
      body,
      params,
    });
  })
  .group('/note', (app) =>
    app
      .get('/', ({ note }) => note.data)
      .use(getUserId)
      .put(
        '/',
        ({ note, body: { data }, username }) =>
          note.add({ data, author: username }),
        {
          body: 'memo',
        }
      )
      // Validation will applied to all routes after guard is called
      .guard({
        params: t.Object({
          index: t.Number(),
        }),
      })
      .get('/:index', ({ note, params: { index }, error }) => {
        return note.data[index] ?? error(404, 'oh no :(');
      })
      .patch(
        '/:index',
        ({ note, params: { index }, body: { data }, error, username }) => {
          if (index in note.data) {
            return note.update(index, { data, author: username });
          }

          return error(422);
        },
        {
          body: 'memo',
        }
      )
      .delete('/:index', ({ note, params: { index }, error }) => {
        if (index in note.data) return note.remove(index);

        return error(422);
      })
  );
