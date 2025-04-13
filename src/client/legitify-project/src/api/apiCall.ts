import axios, { AxiosInstance, AxiosResponse, CancelToken } from 'axios';

export type ApiCallParams<T> = {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  params?: T;
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

export default async function apiCall<T, U = any>({
  method,
  path,
  params,
  cancelToken,
  config = {},
  headers,
}: ApiCallParams<U>): Promise<T> {
  // Special handling for FormData (file uploads)
  if (params instanceof FormData) {
    console.log('FormData detected in apiCall', { path });

    // For FormData, we need to completely skip any Content-Type header
    // to allow the browser to set it properly with boundary
    const formDataConfig = {
      ...config,
      headers: {
        ...config.headers,
        ...headers,
        // Explicitly remove Content-Type header
      },
    };

    // Delete Content-Type header to let the browser handle it
    if (formDataConfig.headers) {
      delete formDataConfig.headers['Content-Type'];
    }

    try {
      console.log('Sending FormData request');
      const response: AxiosResponse<T> = await axiosInstance({
        url: path,
        method,
        data: params,
        cancelToken,
        ...formDataConfig,
      });
      return response.data;
    } catch (error: any) {
      console.error('FormData request failed:', error);
      // Handle errors for FormData requests
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Unknown API error with file upload';
      throw new Error(errorMessage);
    }
  }

  // Regular API call flow for non-FormData requests
  const parameters = method === 'get' ? { params } : { data: params };

  const mergedConfig = {
    ...config,
    headers: {
      ...config.headers,
      ...headers,
    },
  };

  const requestConfig = {
    url: path,
    method,
    cancelToken,
    ...mergedConfig,
    ...parameters,
  };

  try {
    const response: AxiosResponse<T> = await axiosInstance(requestConfig);
    return response.data;
  } catch (error: any) {
    // Enhanced error handling for payload size issues
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
