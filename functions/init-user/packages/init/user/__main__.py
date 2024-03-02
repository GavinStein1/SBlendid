import os
from neo4j import GraphDatabase
import requests

def main(args):
      access_token = args.get("accessToken")
      if access_token is None:
            return {"status": 401, "body": "No access token"}
      
      neo4j_password = os.environ.get("NEO4J_PASSWORD")
      db_uri = "neo4j+s://5a2557f6.databases.neo4j.io"
      user = "neo4j"
      try:
            spotify_url = "https://api.spotify.com/v1/me"
            headers = {
                  "Authorization": "Bearer " + access_token
            }
            response = requests.get(spotify_url, headers=headers)
            if response.status_code != 200:
                  raise ValueError

            user_data = response.json()
            display_name = user_data["display_name"]
            href = user_data["external_urls"]["spotify"]
            id = user_data["id"]
            uri = user_data["uri"]

            query = """
            MERGE (user:User {uri: $uri})
            ON CREATE SET user.display_name = $displayName, user.href = $href, user.user_id = $userID
            RETURN user;
            """
            parameters = {
                  "uri": uri,
                  "displayName": display_name,
                  "href": href,
                  "userID": id
            }

            driver = GraphDatabase.driver(db_uri, auth=(user, neo4j_password))
            session = driver.session()

            session.run(query, parameters=parameters)
            session.close()
            driver.close()
      except:
            return {"status": 500, "body": "Server Error"}


      
      return {"body": "Success"}
