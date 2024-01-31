import checkToken from "@/scripts/checkToken";
import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    Button,
    Link
} from "@nextui-org/react";
import { useEffect, useState } from "react";

interface Group {
    name: string;
    id: string;
    owner: string;
  }

export default function Header() {

    const [accessToken, setAccessToken] = useState("");
    

    useEffect(() => {
        if (typeof window !== "undefined") {
            const access = localStorage.getItem("access_token");
            const expiry = localStorage.getItem("token_expiry");
            if (!!access && !!expiry) {
                const valid = checkToken(expiry);
                if (valid) {
                setAccessToken(access);
                }
            }
        }
    }, [accessToken]);
    
    return (
        <div>
            <Navbar className="navbar-fixed">
                <NavbarContent>
                    <NavbarBrand>
                        <Link href="/">
                            <h1 className="text-xl font-bold text-shadow mt-4 mb-6 p-2 uppercase leading-loose">Sblendid</h1>
                        </Link>
                    </NavbarBrand>
                </NavbarContent>
                <NavbarContent className="hidden sm:flex gap-4" justify="center">
                    
                </NavbarContent>
                <NavbarContent justify="end">
                    <NavbarItem>
                        {!accessToken ? (
                            <div></div>
                        ) : (
                            // <Button variant="solid" color="secondary" onClick={() => {
                            //     createGroup("New blend");
                            // }}>
                            //     New blend
                            // </Button>
                            <div></div>
                        )}
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
        </div>
    )
}