"use client"

import { Button, CircularProgress } from "@nextui-org/react";
import { useEffect, useState } from "react";
import checkToken from "@/scripts/checkToken";
import HomeCard from "@/components/homeCard";

interface Group {
  name: string;
  id: string;
  owner: string;
}

export default function Home() {
  var clientID = "";
  const scope = "user-top-read user-read-private user-read-email playlist-modify-public";
  var redirectURI = "";
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  const [accessToken, setAccessToken] = useState<string | null>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isGroupsRetrieved, setIsGroupsRetrieved] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
  }

  async function sha256(plain: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
  
    return window.crypto.subtle.digest('SHA-256', data);
  }

  async function base64URLEncode(buffer: ArrayBuffer): Promise<string> {
    // Convert ArrayBuffer to Uint8Array
    const byteArray = new Uint8Array(buffer);
    const byteNumbers = Array.from(byteArray);
    // Use btoa to Base64 encode the Uint8Array
    const base64String = btoa(String.fromCharCode(...byteNumbers));
  
    // Replace characters that are not URL-safe
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function generateCodeChallenge(): Promise<{ codeChallenge: string, codeVerifier: string }> {
    const codeVerifier = generateRandomString(64); // Create a random string of length 43
    const hashed = await sha256(codeVerifier);
    const codeChallenge = await base64URLEncode(hashed);
    return { codeChallenge, codeVerifier };
  }

  async function doAuthentication() {
    // Get code challenge/verifier
    const { codeChallenge, codeVerifier } = await generateCodeChallenge();
    window.localStorage.setItem("code_verifier", codeVerifier);

    // Set request params
    const params = {
      response_type: 'code',
      client_id: clientID,
      scope,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: redirectURI,
    }
    console.log(params);
    // Go to auth endpoint
    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
  }

  async function createGroup(name: string) {
    if (!accessToken || name === "") {
      return;
    }
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        accessToken: accessToken
      })
    };
    const response = await fetch(`/api/init/group?name=${name}`, payload);
    if (response.status != 200) {
      throw new Error("failed to create group");
    }
    const json = await response.json();
    return json.record.id;
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      redirectURI = process.env.NEXT_PUBLIC_VERCEL_URL ? 'https://s-blendid.vercel.app/callback' : 'http://localhost:3000/callback';
      clientID = !process.env.NEXT_PUBLIC_VERCEL_URL ? "015128077904436f9d8db713e728695f" : "d0469b414ffa4d9d9c462d4adc6545f2";
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
        console.log(window.innerWidth);
      };

      // initial screen check
      handleResize();

      // Listen for window resize events
      window.addEventListener('resize', handleResize);
      const access = localStorage.getItem("access_token");
      const expiry = localStorage.getItem("token_expiry");
      if (!!access && !!expiry) {
        const valid = checkToken(expiry);
        if (valid) {
          setAccessToken(access);
          const getData = async () => {
            const payload = {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  accessToken: access
                })
            };
            
            // Get group data
            var groupResponse = await fetch("api/data/groups", payload);
            const groupData = await groupResponse.json();
            var tmpGroups: Group[] = []
            for (var i = 0; i < groupData.groups.length; i ++) {
              tmpGroups.push(groupData.groups[i].properties);
            }
            setGroups(tmpGroups);
            setIsGroupsRetrieved(true);
          }
          getData();
        }
      }
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
    
  }, [accessToken]);

  return (
    <div>
      {isMobile ? (
        <div className="under-header padding-20 background-img-mob">
          <HomeCard 
              buttonText={!accessToken ? "Connect Spotify" : "Make a blend"}
              buttonOnClick={!accessToken ? 
                doAuthentication : async () => {
                  const id = await createGroup("My new Blend");
                  return id;}}
              />
        </div>
      ) : (
        <div className="under-header main-container padding-20 background-img">
          <div className="main-div">
            <HomeCard 
              buttonText={!accessToken ? "Connect Spotify" : "Make a blend"}
              buttonOnClick={!accessToken ? 
                doAuthentication : async () => {
                  const id = await createGroup("My new Blend");
                  return id;}}
              />
          </div>
          <div className="main-div">
          </div>
        </div>
      )}
      
    </div>
  )
}
