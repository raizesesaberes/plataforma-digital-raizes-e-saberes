import React from 'react';
import {Feather} from '@expo/vector-icons';
export type AppIconProps = React.ComponentProps<typeof Feather>;
export function AppIcon(props:AppIconProps){return <Feather {...props}/>;}
