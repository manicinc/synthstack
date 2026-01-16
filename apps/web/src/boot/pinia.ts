/**
 * Pinia Store Boot File
 */
import { boot } from 'quasar/wrappers';
import { createPinia } from 'pinia';

export default boot(({ app }): void => {
  const pinia = createPinia();
  app.use(pinia);
});

