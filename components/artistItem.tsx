import { useEffect, useState } from "react";
import { User, Link } from "@nextui-org/react";
import UserSkeleton from "./userSkeleton";
import checkToken from "@/scripts/checkToken";

interface ArtistProps {
    uri: string;
}

interface SpotifyArtist {
    external_urls: {
      spotify: string;
    };
    followers: {
      href: string;
      total: number;
    };
    genres: string[];
    href: string;
    id: string;
    images: {
      url: string;
      height: number;
      width: number;
    }[];
    name: string;
    popularity: number;
    type: string;
    uri: string;
}

const ArtistItem: React.FC<ArtistProps> = ({ uri }) => {
    const [accessToken, setAccessToken] = useState<string | null>();
    const [artist, setArtist] = useState<SpotifyArtist>();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const access = localStorage.getItem("access_token");
            const expiry = localStorage.getItem("token_expiry");
            if (!!access && !!expiry) {
                if (checkToken(expiry)) {
                    setAccessToken(access);
                    const parts = uri.split(":");
                    if (parts.length != 3) {
                        console.log("invalid uri");
                        return;
                    }
                    const setArtistCall = async () => {
                        setArtist(await getArtist(parts[2], access));
                    }
                    setArtistCall();
                }
            }
        }
    }, [accessToken]);
    if (!accessToken || !artist) {
        return (
            <UserSkeleton />
        )
    }

    return (
        <div className="padding-5">
            <User 
                name={artist.name}
                avatarProps={{
                    src: !artist || !artist.images[0] ? "" : artist.images[0].url
                }}
            />

        </div>
    )
}

export default ArtistItem;

async function getArtist(artistURI: string, accessToken: string): Promise<SpotifyArtist> {
    const headers = new Headers({
        'Authorization': `Bearer ${accessToken}`
    });
    const fetchData = {
        method: 'GET',
        headers: headers
    }
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistURI}`, fetchData);
    const artistJson = await artistResponse.json();
    return artistJson;
}