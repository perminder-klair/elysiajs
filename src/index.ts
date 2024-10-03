import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { serverTiming } from '@elysiajs/server-timing';

import { user } from './plugins/user';
import { note } from './plugins/note';

const app = new Elysia()
  .use(swagger())
  .use(serverTiming())
  .onError(({ error, code }) => {
    if (code === 'NOT_FOUND') return 'Not Found :(';

    console.error(error);
  })
  .get('/', ({ path }) => path)
  .get('/hello', 'Do you miss me?')
  .post('/hello', 'No, I do not!')
  .use(user)
  .use(note)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
