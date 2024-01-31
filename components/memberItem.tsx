import { useEffect, useState } from "react";
import { User, Link } from "@nextui-org/react";
import checkToken from "@/scripts/checkToken";

interface Member {
    username: string;
}

interface SpotifyUser {
    display_name: string;
    external_urls: {
      spotify: string;
    };
    followers: {
      href: string;
      total: number;
    };
    href: string;
    id: string;
    images: {
      url: string;
      height: number;
      width: number;
    }[];
    type: string;
    uri: string;
}

const MemberItem: React.FC<Member> = ({ username }) => {
    const [accessToken, setAccessToken] = useState<string | null>();
    const [user, setUser] = useState<SpotifyUser>();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const access = localStorage.getItem("access_token");
            const expiry = localStorage.getItem("token_expiry");
            if (!!access && !!expiry) {
                if (checkToken(expiry)) {
                    setAccessToken(access);
                    const setUserCall = async () => {
                        setUser(await getUser(username, access));
                    }
                    setUserCall();
                }
            }
        }
    }, [accessToken]);
    if (!accessToken) {
        return (
            <div>
                no access token;
            </div>
        )
    }

    return (
        <div className="padding-5">
            <User 
                name={user?.display_name}
                description={(
                    <Link href={user?.external_urls.spotify} size="sm" isExternal>
                        @{user?.id}
                    </Link>
                )}
                avatarProps={{
                    src: user?.images[0].url
                }}
            />

        </div>
    )
}

export default MemberItem;

async function getUser(username: string, accessToken: string) {
    const headers = new Headers({
        'Authorization': `Bearer ${accessToken}`
    });
    const fetchData = {
        method: 'GET',
        headers: headers
    }
    const userResponse = await fetch(`https://api.spotify.com/v1/users/${username}`, fetchData);
    const userJson = await userResponse.json();
    return userJson;
}