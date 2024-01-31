"use client"

import { Button, CircularProgress, Tabs, Tab } from "@nextui-org/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faCheck } from '@fortawesome/free-solid-svg-icons';



import ArtistCard from "@/components/artistCard";
import MembersList from "@/components/members";
import ArtistItem from "@/components/artistItem";
import checkToken from "@/scripts/checkToken";

interface Artist {
  genres: string[];
  popularity: number;
  name: string;
  id: string;
  href: string;
  uri: string;
}

interface Group {
  id: string;
  name: string;
  owner: string;
}

export default function Group() {
  const router = useRouter();
  const { id } = router.query;
  const clientID = "015128077904436f9d8db713e728695f";
  const scope = "user-top-read user-read-private user-read-email playlist-modify-public";
  var redirectURI = "";
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  const [accessToken, setAccessToken] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [group, setGroup] = useState<Group>();
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [weights, setWeights] = useState<number[]>([]);
  const [userCount, setUserCount] = useState<number[]>([]);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEditting, setIsEditting] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isBlending, setIsBlending] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    redirectURI = process.env.NEXT_PUBLIC_VERCEL_URL ? 'https://s-blendid.vercel.app/callback/' : 'http://localhost:3000/callback';
    // Check Spotify access token
    const access = localStorage.getItem("access_token");
    const expiry = localStorage.getItem("token_expiry");
    if (!!access && !!expiry) {
      if (!checkToken(expiry)) {
        doAuthentication();
        return;
      }
      setAccessToken(access);
      let groupID: string = typeof id === "string" ? id : (id[0] as string);
      
      // Check user is a member of the group
      const checkUser = async () => {
        const requestPayload = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            accessToken: access,
            groupID
          })
        }
        const groupUserResponse = await fetch("/api/data/groupUsers", requestPayload);
        if (groupUserResponse.status == 420) {
          // Add user to group
          await fetch("/api/init/addUser", requestPayload);
          router.push(`/group/${groupID}`);
        }
      }
      
      const getData = async () => {
        localStorage.setItem("group_id", groupID);
        const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';
        const payload = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            accessToken: access,
            id: groupID
          })
        };
        const groupResponse = await fetch(`${baseUrl}/api/data/group`, payload);
        const groupJson = await groupResponse.json();
        setGroup(groupJson.groupData);
        setGroupName(groupJson.groupData.name);
        setIsLoadingGroup(false);
        const artistResponse = await fetch("/api/data/artist", payload);
        if (artistResponse.status == 215) {
          throw new Error("No shared artists");
        } else if (artistResponse.status != 200) {
          throw new Error("Error getting artists");
        }
        const jsonData = await artistResponse.json();
        var tmpArtists: Artist[] = [];
        var tmpWeights: number[] = [];
        var tmpUserCounts: number[] = [];
        for (var i = 0; i < jsonData.artists.length; i ++) {
          tmpArtists.push(jsonData.artists[i].properties);
          tmpWeights.push(jsonData.weights[i]);
          tmpUserCounts.push(jsonData.userCounts[i]);
        }
        setArtists(tmpArtists);
        setWeights(tmpWeights);
        setUserCount(tmpUserCounts);
        setIsLoadingArtists(false);
      }
      
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };

      checkUser().then(() => {
        getData();
      });

      // initial screen check
      handleResize();

      // Listen for window resize events
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
    } else if (!access) {
      doAuthentication();
    }
  }, [id]);

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
    // Go to auth endpoint
    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
  }

  async function postGroupName(newName: string) {
    const access = localStorage.getItem("access_token");
    const groupID = group?.id;
    if (!access || !groupID) {
      return;
    }
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        accessToken: access,
        groupID,
        groupName: newName
      })
    }
    await fetch("/api/init/changeGroupName", payload);
  }

  async function blendPlaylist() {
    window.open("https://open.spotify.com/playlist/2AuLcQCP9dKN7fPzTGApUn");
    setIsBlending(true);
    const access = localStorage.getItem("access_token");
    const groupID = group?.id;
    if (!access || !groupID) {
      return;
    }
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        accessToken: access,
        groupID
      })
    }
    
    const blendResponse = await fetch("/api/init/blendPlaylist", payload);
    const blendJson = await blendResponse.json();
    const playlistURL = blendJson.playlistURL;
    setIsBlending(false);
    window.open(playlistURL);
  }
  
  const toggleExpand = () => {
    setIsListExpanded(!isListExpanded);
  };

  return (
      <div>
        {isLoadingGroup ? (
          <div className="center-div">
            <CircularProgress aria-label="Loading..." />
          </div>
        ) : (
          <div>
            {isMobile ? (
              <div>
                <div className="padding-20">
                  {isEditting ? (
                    <div className="flex under-header item-center">
                      <input 
                        type="text"
                        value={groupName}
                        onChange={(event) => {
                          setGroupName(event.target.value);
                        }} 
                        className="border rounded-md focus:outline-none focus:border-blue-500 hover:bg-gray-100 mr-4 primary-color text-3xl"/>
                      <FontAwesomeIcon
                        icon={faCheck}
                        onClick={() => {
                        postGroupName(groupName);
                        setIsEditting(false);
                        }}
                        className="w-6 h-6 primary-color edit-icon"/>
                    </div>
                  ) : (
                    <div className="flex under-header item-center">
                      <h1 className="text-3xl font-bold text-shadow mr-4 primary-color flex-initial">{groupName}</h1>
                      <FontAwesomeIcon className="flex-initial w-6 h-6 primary-color edit-icon" icon={faPencilAlt} onClick={() => {
                        setIsEditting(true);
                      }} />
                    </div>
                  )}
                  <Tabs className="margin-top-20">
                    <Tab key="members" title="Members">
                      <MembersList groupID={group?.id} groupName={group?.name}></MembersList>
                    </Tab>
                    <Tab key="artists" title="Featured artists">
                      {isLoadingArtists ? (
                        <div className="center-div">
                          <CircularProgress aria-label="Loading..." />
                        </div>
                      ) : (
                        <div className="mt-6 center-h">
                          <Button 
                            className="padding-5 half-width margin-bottom-20"
                            color="secondary"
                            onClick={blendPlaylist}
                            isLoading={isBlending}
                          >{isBlending ? "Blending..." : "Blend"}</Button>
                          <div className="padding-20 grid grid-cols-1 gap-5">
                            {artists.slice(0,5).map( (artist, index) => {
                              return <ArtistCard artistURI={artist.uri} key={index}/>
                            })}
                          </div>
                          <div className={`expandable-section ${isListExpanded ? 'expanded' : ''}`}>
                            {isListExpanded && (
                              <div className="grid grid-cols-2 gap-4">
                                <ul>
                                  {artists.slice(10,25).map( (artist, index) => {
                                    return (
                                      <li key={index}>
                                        <ArtistItem uri={artist.uri} />
                                      </li>
                                    )
                                  })}
                                </ul>
                                <ul>
                                  {artists.slice(25).map( (artist, index) => {
                                    return (
                                      <li key={index}>
                                        <ArtistItem uri={artist.uri} />
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            )}
                            <Button onClick={toggleExpand} className="center-h margin-top-20" color="primary">
                              {isListExpanded ? 'Hide' : 'See more'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Tab>
                  </Tabs>
                </div>
              </div>
            ) : (
              <div>
                <div className="group-page-container">
                  <div className="group-left-div">
                    {isEditting ? (
                      <div className="flex under-header item-center">
                        <input 
                          type="text"
                          value={groupName}
                          onChange={(event) => {
                            setGroupName(event.target.value);
                          }} 
                          className="border rounded-md focus:outline-none focus:border-blue-500 hover:bg-gray-100 mr-4 primary-color text-3xl max-w-[80%]"/>
                        <FontAwesomeIcon
                          icon={faCheck}
                          onClick={() => {
                          postGroupName(groupName);
                          setIsEditting(false);
                          }}
                          className="w-6 h-6 primary-color edit-icon"/>
                      </div>
                    ) : (
                      <div className="flex under-header item-center">
                        <h1 className="text-3xl font-bold text-shadow mr-4 primary-color flex-initial">{groupName}</h1>
                        <FontAwesomeIcon className="flex-initial w-6 h-6 primary-color edit-icon" icon={faPencilAlt} onClick={() => {
                          setIsEditting(true);
                        }} />
                      </div>
                    )}
                    <MembersList groupID={group?.id} groupName={group?.name}></MembersList>
                  </div>
                  <div className="group-right-div">
                    {isLoadingArtists ? (
                      <div className="center-div">
                        <CircularProgress aria-label="Loading..." />
                      </div>
                    ) : (
                      <div className="content-margin">
                        <div className="flex mb-6 justify-between">
                          <h1 className="text-3xl font-bold text-shadow primary-color flex-initial">Featured artists</h1>
                          <Button 
                            className="flex-initial align-right edit-icon"
                            color="secondary"
                            onClick={blendPlaylist}
                            isLoading={isBlending}
                          >{isBlending ? "Blending..." : "Blend"}</Button>
                        </div>
                        <div className="grid grid-cols-5 gap-5">
                          {artists.slice(0,10).map( (artist, index) => {
                            return <ArtistCard artistURI={artist.uri} key={index}/>
                          })}
                        </div>
                        <div className={`expandable-section ${isListExpanded ? 'expanded' : ''}`}>
                          {isListExpanded && (
                            <div className="grid grid-cols-2 gap-4">
                              <ul>
                                {artists.slice(10,25).map( (artist, index) => {
                                  return (
                                    <li key={index}>
                                      <ArtistItem uri={artist.uri} />
                                    </li>
                                  )
                                })}
                              </ul>
                              <ul>
                                {artists.slice(25).map( (artist, index) => {
                                  return (
                                    <li key={index}>
                                      <ArtistItem uri={artist.uri} />
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                          <Button onClick={toggleExpand} className="center-h margin-top-20" color="primary">
                            {isListExpanded ? 'Hide' : 'See more'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
      </div>
    );
}