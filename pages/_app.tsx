import "@/styles/globals.css";
import type { AppProps } from "next/app";
import {NextUIProvider} from "@nextui-org/react";
import Header from "@/components/header";

export default function App({ Component, pageProps }: AppProps) {
  return (
  <NextUIProvider>
    <Header />
    <Component {...pageProps} />
  </NextUIProvider>
  )
}
