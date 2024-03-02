import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { CircularProgress } from "@nextui-org/react";
import checkToken from "@/scripts/checkToken";

export default function Callback() {
    const router = useRouter();

    const tokenURL = "https://accounts.spotify.com/api/token";

    const getToken = async (code: string) => {
        
        var tmpClientID = "";
        var tmpRedirectURI = "";
        
        if (typeof window !== "undefined") {
            if (window.location.href.includes("localhost")) {
                tmpRedirectURI = "http://localhost:3000/callback";
                tmpClientID = "015128077904436f9d8db713e728695f";
            } else {
                tmpClientID = "d0469b414ffa4d9d9c462d4adc6545f2";
                tmpRedirectURI = "https://s-blendid.vercel.app/callback";
            }
        }

        let codeVerifier = localStorage.getItem('code_verifier');
        if (!codeVerifier) {
            console.error("Could not read code verifier.");
            return;
        }
      
        const payload = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: tmpClientID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: tmpRedirectURI,
            code_verifier: codeVerifier,
          })
        };
      
        const response = await fetch(tokenURL, payload);
        if (response.status != 200) {
            console.error("Failed getting access token.");
            return;
        }

        const json = await response.json();
      
        localStorage.setItem('access_token', json.access_token);
        const expiry = (Math.floor(Date.now() / 1000) + 3600).toString();
        localStorage.setItem('token_expiry', expiry);
        return json.access_token;
    }

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (!code) {
            console.error("Could not read code param.");
            router.push("/");
            return;
        }
        const runAsyc = async () => {
            await getToken(code).then(
                async (result) => {
                    const payload = {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                          accessToken: result
                        })
                    };
                    
                    // Get user data & create if does not exist
                    var userResponse = await fetch("/api/data/user", payload);
                    if (userResponse.status == 210) {  // 210 indicates no user found with that user uri
                        const response = await fetch("https://faas-syd1-c274eac6.doserverless.co/api/v1/web/fn-932a2f2e-ac27-4caa-a3ce-30940a9ab43a/init/user", payload);
                        if (response.status != 200) {
                            throw new Error("Error initialising new user");
                        }
                        userResponse = await fetch("/api/data/user", payload);
                    } else if (userResponse.status != 200) {
                        throw new Error("Error getting user info");
                    }
                    
                    const userBody = await userResponse.json();
                    localStorage.setItem("user_uri", userBody.userData.uri);
                    localStorage.setItem("user_display_name", userBody.userData.user_id);
                    localStorage.setItem("user_href", userBody.userData.href);
                    
                    // redirect to group if exists
                    const groupID = localStorage.getItem("group_id");
                    if (!groupID) {
                        router.push("/");
                    } else {
                        router.push(`/group/${groupID}`);
                    }
                }
            )
        }
        runAsyc();
    }, []);
    
    return (
        <div className="center-div">
            <CircularProgress aria-label="Loading..." />
        </div>
    )
}