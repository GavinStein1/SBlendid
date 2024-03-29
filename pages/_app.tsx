import "@/styles/globals.css";
import type { AppProps } from "next/app";
import {NextUIProvider} from "@nextui-org/react";
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
  <NextUIProvider>
    <Component {...pageProps} />
    <Analytics />
  </NextUIProvider>
  )
}
