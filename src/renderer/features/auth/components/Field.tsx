import { forwardRef, type InputHTMLAttributes } from 'react';
import styled from 'styled-components';

const Wrapper = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const StyledInput = styled.input<{ $invalid?: boolean }>`
  width: 100%;
  height: 64px;
  padding: 0 24px;
  border-radius: 14px;
  border: 1.5px solid
    ${({ theme, $invalid }) =>
      $invalid ? theme.colors.danger : theme.brand.inputBorder};
  background: ${({ theme }) => theme.brand.inputBg};
  font-size: 16px;
  color: ${({ theme }) => theme.brand.inputText};
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &::placeholder {
    color: ${({ theme }) => theme.brand.inputPlaceholder};
  }

  &:focus {
    border-color: ${({ theme, $invalid }) =>
      $invalid ? theme.colors.danger : theme.brand.inputBorderFocus};
    box-shadow: 0 0 0 4px
      ${({ $invalid }) =>
        $invalid ? 'rgba(229, 72, 77, 0.12)' : 'rgba(140, 102, 96, 0.14)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.danger};
  padding-left: 8px;
`;

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { error, ...inputProps },
  ref,
) {
  return (
    <Wrapper>
      <StyledInput ref={ref} $invalid={Boolean(error)} {...inputProps} />
      {error && <ErrorText>{error}</ErrorText>}
    </Wrapper>
  );
});
