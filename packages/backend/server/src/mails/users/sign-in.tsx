import { Button, Content, P, Template, Title } from '../components';

export type SignInProps = {
  url: string;
};

export default function SignUp(props: SignInProps) {
  return (
    <Template>
      <Title>Sign in to AFFiNE</Title>
      <Content>
        <P>
          Click the button below to securely sign in. The magic link will expire
          in 30 minutes.
        </P>
        <Button href={props.url}>Sign in to AFFiNE</Button>
      </Content>
    </Template>
  );
}
