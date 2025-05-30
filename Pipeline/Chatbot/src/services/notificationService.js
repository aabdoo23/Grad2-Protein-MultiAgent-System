import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const defaultToastOptions = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored",
};

export const showErrorToast = (message) => {
  toast.error(message, defaultToastOptions);
};

export const showSuccessToast = (message) => {
  toast.success(message, defaultToastOptions);
};

export const showInfoToast = (message) => {
  toast.info(message, defaultToastOptions);
};

export const showWarningToast = (message) => {
  toast.warn(message, defaultToastOptions);
};

// You can add more specific toast functions if needed 