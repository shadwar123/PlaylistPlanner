import { NextRequest, NextResponse } from "next/server";
import { PlaywrightCrawler, Dataset } from "crawlee";
import { v4 as uuidv4 } from "uuid";

interface VideoData {
  title: string;
  views: number;
  thumbnail: string;
  vidLength: string;
}

interface PlaylistData {
  videoList: VideoData[];
  graphData: { name: string; views: number }[];
  totalLengthPlaylist:string;
}

export async function POST(request: NextRequest) {
  const { playlistUrl } = await request.json();

  if (!playlistUrl) {
    return NextResponse.json(
      { error: "Playlist URL is required" },
      { status: 400 }
    );
  }

  const playlistId = new URL(playlistUrl).searchParams.get("list");
  if (!playlistId) {
    return NextResponse.json(
      { error: "Invalid playlist URL" },
      { status: 400 }
    );
  }

  const uuid = uuidv4();
  const dataset = await Dataset.open(`playlist-${uuid}`);

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 50,
    async requestHandler({ request, page, log }) {
      log.info(`Processing ${request.url}...`);

      await page.waitForSelector("#contents ytd-playlist-video-renderer", {
        timeout: 30000,
      });

      // Scroll to load all videos
      await page.evaluate(async () => {
        while (true) {
          const oldHeight = document.body.scrollHeight;
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (document.body.scrollHeight === oldHeight) break;
        }
      });

      const videos: VideoData[] = await page.$$eval(
        "#contents ytd-playlist-video-renderer",
        (elements) => {
          return elements.map((el) => {
            const title =
              el.querySelector("#video-title")?.textContent?.trim() || "";
            const viewsText =
              el.querySelector("#video-info span")?.textContent?.trim() || "";
            const thumbnail = el.querySelector("img")?.src || "";

            const vidLength =  el.querySelector("#time-status span")?.textContent?.trim() || "";

            const viewsMatch = viewsText.match(/^([\d,.]+[KMB]?)\s*views?$/i);
            let views = 0;
            if (viewsMatch) {
              const viewString = viewsMatch[1].toUpperCase().replace(/,/g, "");
              if (viewString.endsWith("K"))
                views = parseFloat(viewString) * 1000;
              else if (viewString.endsWith("M"))
                views = parseFloat(viewString) * 1000000;
              else if (viewString.endsWith("B"))
                views = parseFloat(viewString) * 1000000000;
              else views = parseInt(viewString);
            }

            return { title, views, thumbnail , vidLength };
          });
        }
      );

      log.info(`Found ${videos.length} videos in the playlist`);

      await dataset.pushData({ videos });
    },

    failedRequestHandler({ request, log }) {
      log.error(`Request ${request.url} failed too many times.`);
    },
  });

  try {
    // Use a unique key for the request to bypass caching
    await crawler.run([
      { url: playlistUrl, uniqueKey: `${playlistUrl}:${uuid}` },
    ]);

    const results = await dataset.getData();
    const videos = (results.items[0]?.videos as VideoData[]) || [];

    const graphData = videos.map((video, index) => ({
      name: `Video ${index + 1}`,
      views: video.views,
    }));


// Helper function to convert "MM:SS" to total seconds
const timeStringToSeconds = (time: string): number => {
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * 60 + seconds;
};

// Helper function to convert total seconds back to "HH:MM:SS"
const secondsToTimeString = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Calculate total playlist length
const totalLengthInSeconds = videos.reduce((acc, video) => {
  return acc + timeStringToSeconds(video?.vidLength);
}, 0);

// Save the total playlist length in the desired format (HH:MM:SS or MM:SS)
const totalLengthPlaylist = secondsToTimeString(totalLengthInSeconds);

console.log("Total Playlist Length:", totalLengthPlaylist);

    const playlistData: PlaylistData = {
      videoList: videos,
      graphData: graphData,
      totalLengthPlaylist:totalLengthPlaylist,
    };

    await dataset.drop();

    return NextResponse.json(playlistData);
  } catch (error) {
    console.error("Crawling failed:", error);
    await dataset.drop();
    return NextResponse.json(
      { error: "An error occurred while scraping the playlist" },
      { status: 500 }
    );
  }
}
