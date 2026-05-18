import styled from 'styled-components';

export const PrimaryButton = styled.button`
  width: 100%;
  height: 64px;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.primary};
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    transform 120ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.brand.primaryHover};
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const TextLink = styled.button`
  align-self: center;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.link};
  background: transparent;
  padding: 8px 4px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;
