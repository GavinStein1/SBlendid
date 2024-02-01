import { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    const id = req.body.id;
    if (!accessToken || !id) {
        res.status(500).json({status: "Failed", message: "Missing params"});    
        return;
    }
    // TODO: user access token is not used and thus not verified as part of group

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
      session = driver.session();
    } catch (error) {
      console.error(error);
      res.status(500).json({status: "Failed", message: "Failed to connect to database"});
      return;
    }

    const query =  `
    MATCH (group:Group {id: $id})<-[:member_of]-(user:User)-[listener:listens_to]->(artist:Artist)
    WITH artist,count(user) as rels, collect(user) as users, sum(listener.weight) as weight
    WITH size(users) as userCount, artist, rels, COUNT {(group)<-[:member_of]-()} as groupSize, weight
    ORDER BY userCount desc, weight asc
    LIMIT 40
    return artist, userCount, weight
    `

    const parameters = {
        id
    }

    session.run(query, parameters).then( results => {
      if (results.records.length == 0) {
        res.status(215).json({status: "Complete", message: "No artists to share"});
      } else {
        const records = results.records;
        const artists = [];
        const userCounts = [];
        const weights = [];
        for (var i = 0; i < records.length; i ++) {
            artists.push(records[i].get("artist"));
            userCounts.push(records[i].get("userCount").low);
            weights.push(records[i].get("weight"));
        }
        res.status(200).json({ artists, userCounts, weights });
      }
    }).catch(error => {
      res.status(500).json({status: "Error", message: "Failed parsing DB data", error});
    }).finally(async () => {
      await session.close();
    });
}