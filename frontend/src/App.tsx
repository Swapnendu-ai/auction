import { Layout } from "./components/Layout";
import { AuctioneerView } from "./pages/AuctioneerView";
import { TeamView } from "./pages/TeamView";
import { useHashRoute } from "./router";

export function App() {
  const route = useHashRoute();

  if (route.name === "team") {
    return (
      <Layout title="Team">
        <TeamView teamParam={route.team} />
      </Layout>
    );
  }

  return (
    <Layout title="Auctioneer">
      <AuctioneerView />
    </Layout>
  );
}








