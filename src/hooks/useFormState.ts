import { useState, useCallback } from 'react';

interface FormStateOptions<T> {
  initialData?: Partial<T>;
  onSubmit?: (data: T) => Promise<void> | void;
  onReset?: () => void;
  validateOnChange?: boolean;
  validator?: (data: Partial<T>) => Record<string, string>;
}

interface FormState<T> {
  data: Partial<T>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

interface FormActions<T> {
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  setData: (data: Partial<T>) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: () => void;
  reset: () => void;
  submit: () => Promise<void>;
  validate: () => boolean;
}

export function useFormState<T = Record<string, any>>(
  options: FormStateOptions<T> = {}
): [FormState<T>, FormActions<T>] {
  const {
    initialData = {},
    onSubmit,
    onReset,
    validateOnChange = false,
    validator
  } = options;

  const [state, setState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    isSubmitting: false,
    isDirty: false,
    isValid: true
  });

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setState(prev => {
      const newData = { ...prev.data, [field]: value };
      const errors = validateOnChange && validator 
        ? validator(newData) 
        : { ...prev.errors };
      
      // Clear field error when value changes
      if (errors[field as string]) {
        delete errors[field as string];
      }

      return {
        ...prev,
        data: newData,
        errors,
        isDirty: true,
        isValid: Object.keys(errors).length === 0
      };
    });
  }, [validateOnChange, validator]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field as string]: error },
      isValid: false
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[field as string];
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, []);

  const setData = useCallback((data: Partial<T>) => {
    setState(prev => {
      const errors = validator ? validator(data) : {};
      return {
        ...prev,
        data,
        errors,
        isDirty: true,
        isValid: Object.keys(errors).length === 0
      };
    });
  }, [validator]);

  const setErrors = useCallback((errors: Record<string, string>) => {
    setState(prev => ({
      ...prev,
      errors,
      isValid: Object.keys(errors).length === 0
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {},
      isValid: true
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      errors: {},
      isSubmitting: false,
      isDirty: false,
      isValid: true
    });
    onReset?.();
  }, [initialData, onReset]);

  const validate = useCallback(() => {
    if (!validator) return true;
    
    const errors = validator(state.data);
    setState(prev => ({
      ...prev,
      errors,
      isValid: Object.keys(errors).length === 0
    }));
    
    return Object.keys(errors).length === 0;
  }, [validator, state.data]);

  const submit = useCallback(async () => {
    if (!onSubmit) return;

    // Validate before submit
    if (validator && !validate()) {
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      await onSubmit(state.data as T);
      setState(prev => ({ ...prev, isDirty: false }));
    } catch (error) {
      // Error handling is done by the caller
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [onSubmit, state.data, validator, validate]);

  const actions: FormActions<T> = {
    setFieldValue,
    setFieldError,
    clearFieldError,
    setData,
    setErrors,
    clearErrors,
    reset,
    submit,
    validate
  };

  return [state, actions];
}