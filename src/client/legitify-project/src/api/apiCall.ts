import axios, { AxiosInstance, AxiosResponse, CancelToken } from "axios";

export type ApiCallParams<T> = {
  method: "get" | "post" | "put" | "delete";
  path: string;
  params?: T;
  config?: {
    headers?: Record<string, string>;
    [key: string]: any;
  };
  cancelToken?: CancelToken;
  axiosInstance?: AxiosInstance;
};

export type ApiResponse<T> = {
  data: T;
  status: number;
  error?: string;
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Debug interceptor to log requests
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export default async function apiCall<T, U = any>({
  method,
  path,
  params,
  cancelToken,
  config,
}: ApiCallParams<U>): Promise<T> {
  const parameters = method === "get" ? { params } : { data: params };

  const requestConfig = {
    url: path,
    method,
    cancelToken,
    ...config,
    ...parameters,
  };

  try {
    const response: AxiosResponse<T> = await axiosInstance(requestConfig);
    return response.data;
  } catch (error: any) {
    // Only redirect on certain 401 conditions
    if (error.response?.status === 401 && !path.includes("/auth/")) {
      // Check if we should redirect or just report the error
      if (window.location.pathname !== "/login") {
        console.warn("Authentication failed. Redirecting to login.");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    // Always throw the error for the calling code to handle
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Unknown API error";
    throw new Error(errorMessage);
  }
}
