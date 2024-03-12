import {Button} from "@nextui-org/react";
import { useRouter } from "next/router";
import { useState } from "react";

interface CardProps {
    buttonText: string;
    buttonOnClick: () => Promise<string> | (() => void);
}

const HomeCard: React.FC<CardProps> = ({ buttonText, buttonOnClick }) => {
    const router = useRouter();
    const [isBlendButtonLoading, setIsBlendButtonLoading] = useState(false);
    return (
        <div className="opaque-bg">
            <h1 className="text-3xl font-bold text-shadow mt-4 leading-loose primary-color">
                Create custom playlists for you and your friends
            </h1>
            <p className="primary-color leading-loose">Quickly create Spotify playlists featuring you and your friends' favourite artists. 
            Simply connect your Spotify, create a blend and send the link to your friends.</p>
            <div className="center-h">
                <Button 
                    className="half-width center-h margin-top-20"
                    color="primary"
                    onClick={async () => {
                        setIsBlendButtonLoading(true);
                        const id = await buttonOnClick();
                        if (!!id) {
                            router.push(`/group/${id}`);
                        }
                    }}
                    isLoading={isBlendButtonLoading}
                >{buttonText}</Button>
            </div>
        </div>
    )
}

export default HomeCard;