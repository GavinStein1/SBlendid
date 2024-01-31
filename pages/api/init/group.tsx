import type { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    const name = req.query.name;
    if (!accessToken) {
        res.status(500).json({status: "Failed", message: "Missing access token param"});    
        return;
    }
    const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';
    const payload = {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
          accessToken: accessToken
      })
    }
    const userResponse = await fetch(`${baseUrl}/api/data/user`, payload);
    if (userResponse.status != 200) {
        res.status(500).json({status: "error getting user data"});
    }
    
    const body = await userResponse.json();
    const userData = body.userData;

    // Neo4j params
    const neo4jPassword = process.env.NEO4J_PASSWORD;
    const DBURI = "neo4j+s://5a2557f6.databases.neo4j.io";
    const user = "neo4j";

    let driver;
    let session: neo4j.Session;
    try {
      if (typeof neo4jPassword === "undefined" || neo4jPassword === "") {
        res.status(500).json({status: "Failed", message: "Failed to connect to database"});
        return;
      }
      driver = neo4j.driver(DBURI, neo4j.auth.basic(user, neo4jPassword));
      await driver.getServerInfo();
      session = driver.session();
    } catch (error) {
      console.error(error);
      res.status(500).json({status: "Failed", message: "Failed to connect to database"});
      return;
    }

    const userURI = userData.uri;
    const groupID = generateRandomString(8);

    // get Groups from DB
    const query = `
      MATCH (user:User {uri: $userURI})
      MERGE (group:Group {id: $groupID})
      ON CREATE SET group.owner = user.display_name, group.name = $name
      MERGE (user)-[:member_of]->(group)
      RETURN group;
    `
    const parameters = {
        userURI,
        groupID,
        name
    }
    const result = await session.run(query, parameters);
    if (result.records.length == 0) {
      res.status(500).json({status: "Failed", message: "Failed DB query"});
    }
    const record = result.records[0].get("group").properties;
    
    session.close();
    console.log(record)
    
    res.status(200).json({record});
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}