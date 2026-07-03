import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export function useApi(request, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request();
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err);
      toast.error(err.response?.data?.message || 'Something went wrong');
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch: run, setData };
}
