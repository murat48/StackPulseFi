'use client';

import { ReactNode } from 'react';
import { Connect } from '@stacks/connect-react';
import { userSession } from '@/lib/stacks/wallet';

interface ConnectProviderProps {
    children: ReactNode;
}

export default function ConnectProvider({ children }: ConnectProviderProps) {
    const authOptions = {
        appDetails: {
            name: 'StackPulseFi',
            icon: typeof window !== 'undefined' ? window.location.origin + '/favicon.ico' : '',
        },
        redirectTo: '/',
        onFinish: () => {
            console.log('✅ Wallet connected');
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        },
        onCancel: () => {
            console.log('❌ Wallet connection cancelled');
        },
        userSession,
    };

    return (
        <Connect authOptions={authOptions}>
            {children}
        </Connect>
    );
}
