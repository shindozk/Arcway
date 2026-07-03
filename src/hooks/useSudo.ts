import { create } from 'zustand';
import { hasSudoPassword } from '../api/system';
import { createLogger } from '../utils/logger';

const log = createLogger('sudo');

interface SudoState {
  hasPassword: boolean;
  showModal: boolean;
  pendingAction: (() => Promise<void>) | null;
  pendingPackageName: string;
  checkPassword: () => Promise<void>;
  requestSudo: (action: () => Promise<void>, packageName?: string) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export const useSudoStore = create<SudoState>((set, get) => ({
  hasPassword: false,
  showModal: false,
  pendingAction: null,
  pendingPackageName: '',

  checkPassword: async () => {
    const result = await hasSudoPassword();
    log.debug(`checkPassword => ${result}`);
    set({ hasPassword: result });
  },

  requestSudo: (action: () => Promise<void>, packageName?: string) => {
    if (get().hasPassword) {
      log.info('Password already set, executing action');
      action();
    } else {
      log.info('Password needed, showing modal');
      set({ showModal: true, pendingAction: action, pendingPackageName: packageName || '' });
    }
  },

  onSuccess: () => {
    const { pendingAction } = get();
    log.info('Sudo modal success, executing pending action');
    set({ showModal: false, hasPassword: true, pendingPackageName: '' });
    if (pendingAction) {
      pendingAction();
      set({ pendingAction: null });
    }
  },

  onClose: () => {
    set({ showModal: false, pendingAction: null, pendingPackageName: '' });
  },
}));
