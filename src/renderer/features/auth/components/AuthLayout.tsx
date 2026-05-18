import type { PropsWithChildren } from 'react';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.brand.background};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 520px;
  background: ${({ theme }) => theme.brand.background};
  border-radius: 40px;
  padding: 64px 56px 48px;
  display: flex;
  flex-direction: column;
  gap: 36px;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.brand.subtitle};
  letter-spacing: -0.01em;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 40px;
  font-weight: 800;
  color: ${({ theme }) => theme.brand.title};
  letter-spacing: -0.02em;
`;

interface Props {
  subtitle: string;
  title: string;
}

export function AuthLayout({
  subtitle,
  title,
  children,
}: PropsWithChildren<Props>) {
  return (
    <Page>
      <Card>
        <Header>
          <Subtitle>{subtitle}</Subtitle>
          <Title>{title}</Title>
        </Header>
        {children}
      </Card>
    </Page>
  );
}
