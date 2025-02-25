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
    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error(error.response?.data?.error || error.message);
  }
}
