import { useEffect, useState } from "react";

import MemberItem from "./memberItem";
import UserSkeleton from "./userSkeleton";
import { Button } from "@nextui-org/react";
import checkToken from "@/scripts/checkToken";

interface Members {
    groupID: string | undefined;
    groupName: string | undefined;
}

interface User {
    display_name: string;
    href: string;
    uri: string;
    user_id: string;
}

const MembersList: React.FC<Members> = ({ groupID, groupName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [inviteButtonText, setInviteButtonText] = useState("Invite")

    useEffect(() => {
        if (!groupID) {
            return;
        }
        const getMembers = async () => {
            const accessToken = localStorage.getItem("access_token");
            const expiry = localStorage.getItem("token_expiry");
            if (!!accessToken && !!expiry) {
                if (checkToken(expiry)) {
                    const payload = {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                          accessToken,
                          groupID
                        })
                    };
                    const usersResponse = await fetch("/api/data/groupUsers", payload);
                    const jsonData = await usersResponse.json();
                    setUsers(jsonData.users);
                    setIsLoading(false);
                }
            }
        }
        getMembers();
    }, []);
    
    return (
        <div className="full-width mt-6">
            <div className="center-h">
                <Button 
                    className="padding-5 half-width margin-bottom-20"
                    color="primary"
                    onClick={() => {
                        const link = window.location.href;
                        navigator.clipboard.writeText(link).then(() => {
                            setInviteButtonText("Copied");
                            setTimeout(() => {
                                // Revert button text to the original after three seconds
                                setInviteButtonText('Invite');
                            }, 3000);
                        })
                    }}    
                >
                    {inviteButtonText}
                </Button>
            </div>
            {isLoading || !users ? (
                <div>
                    <UserSkeleton />
                    <UserSkeleton />
                    <UserSkeleton />
                </div>
            ) : (
                <div>
                <ul>
                    {users.map((user, index) => (
                        <MemberItem key={index} username={user.user_id} />
                    ))}
                </ul>
            </div>
            )}
        </div>
        
    )
}

export default MembersList;