'use client';
import { useEffect } from 'react';
import { initAnalytics } from '../lib/track';

export default function Analytics() {
  useEffect(function () { initAnalytics(); }, []);
  return null;
}
