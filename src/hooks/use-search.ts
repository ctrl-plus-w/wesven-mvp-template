import { type ChangeEventHandler, type Dispatch, type SetStateAction, useState } from 'react';

export interface UseSearchReturnType {
  query: string;

  value: string;
  setValue: Dispatch<SetStateAction<string>>;

  submit: VoidFunction;
  clear: VoidFunction;

  onChange: ChangeEventHandler<HTMLInputElement>;
}

/**
 * Hook for managing search input state with submit and clear actions
 * @param defaultSearch - The initial search query value
 */
const useSearch = (defaultSearch = ''): UseSearchReturnType => {
  const [query, setQuery] = useState(defaultSearch);
  const [value, setValue] = useState('');

  const submit = () => {
    setQuery(value);
  };

  const clear = () => {
    setQuery('');
    setValue('');
  };

  const onChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setValue(event.target.value);
  };

  return { value, setValue, onChange, query, submit, clear };
};

export default useSearch;
