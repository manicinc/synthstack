import { ref } from 'vue';
import { api } from '@/services/api';
import { Notify } from 'quasar';

export interface ContactForm {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export function useContact() {
  const loading = ref(false);
  const submitted = ref(false);

  async function submitContact(form: ContactForm) {
    loading.value = true;
    try {
      await api.post('/contact', form);
      submitted.value = true;
      Notify.create({
        type: 'positive',
        message: 'Message sent successfully! We\'ll get back to you soon.',
        position: 'top',
      });
      return true;
    } catch (error: any) {
      Notify.create({
        type: 'negative',
        message: error.message || 'Failed to send message',
        position: 'top',
      });
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    submitted,
    submitContact,
  };
}
