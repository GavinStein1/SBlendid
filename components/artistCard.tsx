"user client"

import checkToken from "@/scripts/checkToken";
import {Card, CardHeader, CardBody, Image} from "@nextui-org/react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface CardParams {
    artistURI: string;
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

const ArtistCard: React.FC<CardParams> = ({ artistURI }) => {
    const [accessToken, setAccessToken] = useState<string | null>();
    const [artist, setArtist] = useState<SpotifyArtist>();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const access = localStorage.getItem("access_token");
            const expiry = localStorage.getItem("token_expiry");
            if (!!access && !!expiry) {
                if (checkToken(expiry)) {
                    setAccessToken(access);
                    const parts = artistURI.split(":");
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
    if (!accessToken) {
        return (
            <div>
                no access token;
            </div>
        )
    }

    if (!artist) {
        return (
            <div></div>
        )
    }
    return (
        <div>
            <Link href={artist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                <Card className="py-4">
                    <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
                        <p className="text-tiny uppercase font-bold">{artist.name}</p>
                        <small className="text-default-500">{artist.genres.length >= 1 ? artist.genres[0] : "-"}</small>
                    </CardHeader>
                    <CardBody className="overflow-visible py-2">
                        <Image
                            alt="Card background"
                            className="object-cover rounded-xl"
                            src={artist.images.length  >= 1 && artist.images[0] ? artist.images[0].url : ""}
                        />
                    </CardBody>
                </Card>
            </Link>
        </div>
    )
}

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

export default ArtistCard;