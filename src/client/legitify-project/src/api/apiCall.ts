import axios, { AxiosInstance, CancelToken } from 'axios';

export type ApiCallParams<T> = {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  params?: T;
  data?: any;
  config?: {
    headers?: Record<string, string>;
    [key: string]: any;
  };
  cancelToken?: CancelToken;
  axiosInstance?: AxiosInstance;
  headers?: Record<string, string>;
};

export type ApiResponse<T> = {
  data: T;
  status: number;
  error?: string;
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Configure axios to handle larger payloads
  maxContentLength: 10 * 1024 * 1024, // 10MB
  maxBodyLength: 10 * 1024 * 1024, // 10MB
  timeout: 60000, // Increase timeout to 60 seconds for larger uploads
});

axiosInstance.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Debug interceptor to log requests
axiosInstance.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export async function apiCall<T>({
  method,
  path,
  params,
  data,
  headers = {},
}: ApiCallParams<any>): Promise<T> {
  try {
    const isFormData = data instanceof FormData;

    const response = await axiosInstance({
      method,
      url: path,
      params: method === 'get' ? params : undefined,
      data: method !== 'get' ? data || params : undefined,
      headers: {
        ...headers,
        // Let axios set the content type for FormData automatically
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 413) {
      throw new Error(
        'The file is too large for the server to process. Please use a smaller file.',
      );
    }

    // Handle token/auth issues
    if (error.response?.status === 401 && !path.includes('/auth/')) {
      // Check if we should redirect or just report the error
      if (window.location.pathname !== '/login') {
        console.warn('Authentication failed. Redirecting to login.');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    // Always throw the error for the calling code to handle
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Unknown API error';
    throw new Error(errorMessage);
  }
}
