import { useCallback, useState } from 'react';

const DEFAULT_ERROR = 'Unable to sign in. Try again.';

export default function useAuthProviderFlow(navigation) {
  const [errorMsg, setErrorMsg] = useState('');

  const handleSuccess = useCallback((result) => {
    setErrorMsg('');
    const uid = result?.user?.uid || null;
    const creationTime = result?.user?.metadata?.creationTime || null;
    const lastSignInTime = result?.user?.metadata?.lastSignInTime || null;
    const isReturningUser = result?.isNewUser === false
      || (creationTime && lastSignInTime && creationTime !== lastSignInTime);

    if (result?.requiresHandle && uid && !isReturningUser) {
      navigation.navigate('CreateUsername', {
        uid,
        initialHandle: result?.publicProfile?.handle || '',
        pendingProfile: result?.pendingProfile || null,
        nextRoute: 'Tabs',
      });
      return;
    }
    if (uid) {
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      return;
    }
    setErrorMsg(DEFAULT_ERROR);
  }, [navigation]);

  const handleError = useCallback((message) => {
    if (typeof message === 'string' && message.trim()) {
      setErrorMsg(message.trim());
      return;
    }
    setErrorMsg(DEFAULT_ERROR);
  }, []);

  const clearError = useCallback(() => {
    setErrorMsg('');
  }, []);

  return {
    errorMsg,
    handleSuccess,
    handleError,
    clearError,
  };
}
