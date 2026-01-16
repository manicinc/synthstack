import { ref } from 'vue';
import { api } from '@/services/api';
import { Notify } from 'quasar';

export function useNewsletter() {
  const loading = ref(false);
  const subscribed = ref(false);

  async function subscribe(email: string, name?: string, source?: string) {
    loading.value = true;
    try {
      await api.post('/newsletter/subscribe', { email, name, source });
      subscribed.value = true;
      Notify.create({
        type: 'positive',
        message: 'Successfully subscribed to newsletter!',
        position: 'top',
      });
      return true;
    } catch (error: any) {
      Notify.create({
        type: 'negative',
        message: error.message || 'Failed to subscribe',
        position: 'top',
      });
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    subscribed,
    subscribe,
  };
}
