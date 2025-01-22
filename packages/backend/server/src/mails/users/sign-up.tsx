import { Bold, Button, Content, P, Template, Title } from '../components';

export type SignUpProps = {
  url: string;
};

export default function SignUp(props: SignUpProps) {
  return (
    <Template>
      <Title>Create AFFiNE Account</Title>
      <Content>
        <P>
          Click the button below to complete your account creation and sign in.
          This magic link will expire in <Bold>30 minutes</Bold>.
        </P>
        <Button href={props.url}>Create account and sign in</Button>
      </Content>
    </Template>
  );
}

SignUp.PreviewProps = {
  url: 'https://app.affine.pro',
};
