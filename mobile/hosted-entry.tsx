import React from 'react';
import { registerRootComponent } from 'expo';
import { HostedApplication } from './src/HostedApplication';
// Real platform session only. No profile picker, demo mode, or preview assets.
registerRootComponent(HostedApplication);
