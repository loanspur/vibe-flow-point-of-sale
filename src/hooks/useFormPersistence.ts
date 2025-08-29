import { useState, useEffect, useCallback } from 'react';

interface FormPersistenceOptions {
  key: string;
  debounceMs?: number;
  excludeFields?: string[];
  includeFields?: string[];
}

export const useFormPersistence = <T extends Record<string, any>>(
  initialData: T,
  options: FormPersistenceOptions
) => {
  const { key, debounceMs = 500, excludeFields = [], includeFields = [] } = options;
  
  const [data, setData] = useState<T>(() => {
    if (typeof window === 'undefined') return initialData;
    
    try {
      const saved = sessionStorage.getItem(`form_${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialData, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error);
    }
    
    return initialData;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Save data to sessionStorage
  const saveData = useCallback((newData: T) => {
    if (typeof window === 'undefined') return;

    try {
      let dataToSave = { ...newData };
      
      // Filter fields if specified
      if (includeFields.length > 0) {
        dataToSave = Object.keys(dataToSave).reduce((acc, key) => {
          if (includeFields.includes(key)) {
            acc[key as keyof T] = dataToSave[key];
          }
          return acc;
        }, {} as T);
      } else if (excludeFields.length > 0) {
        excludeFields.forEach(field => {
          delete dataToSave[field as keyof T];
        });
      }

      sessionStorage.setItem(`form_${key}`, JSON.stringify(dataToSave));
      setLastSaved(new Date());
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  }, [key, excludeFields, includeFields]);

  // Debounced save
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveData(data);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [data, saveData, debounceMs]);

  // Update data and trigger save
  const updateData = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setData(prev => {
      const newData = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      return newData;
    });
  }, []);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(`form_${key}`);
      setLastSaved(null);
    } catch (error) {
      console.warn('Failed to clear form data:', error);
    }
  }, [key]);

  // Reset to initial data
  const resetData = useCallback(() => {
    setData(initialData);
    clearSavedData();
  }, [initialData, clearSavedData]);

  return {
    data,
    updateData,
    clearSavedData,
    resetData,
    lastSaved,
    isDirty: JSON.stringify(data) !== JSON.stringify(initialData)
  };
};
