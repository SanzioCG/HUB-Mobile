import { Redirect } from 'expo-router';
import { useSession } from '../session/SessionProvider';

export default function Index() {
  const { state } = useSession();
  return <Redirect href={state.status === 'paired' ? '/projects' : '/pair'} />;
}
