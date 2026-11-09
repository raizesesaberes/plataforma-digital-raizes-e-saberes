import React from 'react';
import { registerRootComponent } from 'expo';
import { Application } from './App';
// This entry is used only by the local-preview export script. The normal AppEntry remains unchanged.
function LocalPreview() { return <Application preview />; }
registerRootComponent(LocalPreview);
