"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VideoData {
  title: string;
  views: number;
  thumbnail: string;
  vidLength: string;
}

export default function Home() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [videoData, setVideoData] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalLengthPlaylist, setTotalLengthPlaylist] = useState("");
  const [data, setData] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [experienceLevel, setExperienceLevel] = useState<
    "Beginner" | "Intermediate"
  >("Beginner");
  const [dailyLearningHours, setDailyLearningHours] = useState<number>(2); // Set a default value for daily learning hours

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("data 1", isLoading);
    try {
      const response = await fetch("/api/scrape-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlistUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch playlist data");
      }

      const data = await response.json();
      setVideoData(data.videoList);
      setTotalLengthPlaylist(data.totalLengthPlaylist);
      console.log("data ", data.videoList);
      run(data.videoList); // Pass videoData to run
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const run = async (videoData: VideoData[]): Promise<void> => {
    // Prevent API call if it's already loading
    if (loading) return;

    setLoading(true); // Set loading to true before calling API

    try {
      const genAI = new GoogleGenerativeAI(
        "AIzaSyBRgTnD2LFQzZxZNJoyrep3Eckl1yOdEHA"
      );
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Construct the prompt using the playlist data, experience level, and daily learning hours
      const prompt = `I have a YouTube playlist with multiple video titles and their durations. My experience level is ${experienceLevel}, and I plan to learn for ${dailyLearningHours} hours each day. 

Analyze the difficulty of each video based on its title (easy or hard). For beginners, assume it will take longer to learn from harder videos. For intermediate learners, adjust the schedule to progress faster through easier topics.

Here is the playlist data:
${JSON.stringify(
  videoData.map((video) => ({
    title: video.title,
    vidLength: video.vidLength,
  })),
  null,
  2
)}

**Output the learning schedule only in the following format:**

Day 1: [Video Title] — [Duration]  
Day 2: [Video Title] — [Duration]  
...  
Day n: [Video Title] — [Duration]  

Ensure the total viewing time does not exceed my daily learning hours and adjust the schedule according to my experience level.
`;

      const result = await model.generateContent(prompt);

      // Assuming `result.response.text()` is the correct way to get the response
      const generatedText: string = await result.response.text(); // Specify the type for generatedText
      setData(generatedText);
      console.log("Generated content:", generatedText);
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setLoading(false); // Reset loading state after the API call
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    } else {
      return views.toString();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>YouTube Playlist Task Planner</CardTitle>
          <CardDescription>
            Enter a YouTube playlist URL to analyze its videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
            <Input
              type="url"
              placeholder="Enter YouTube playlist URL"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              required
              // className="w-full mb-4" // Full width input with bottom margin
            />

            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <select
                  value={experienceLevel}
                  onChange={(e) =>
                    setExperienceLevel(
                      e.target.value as "Beginner" | "Intermediate"
                    )
                  }
                  className="border p-2 rounded"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                </select>
                <select
                  value={dailyLearningHours}
                  onChange={(e) =>
                    setDailyLearningHours(Number(e.target.value))
                  }
                  className="border p-2 rounded"
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={3}>3 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={5}>5 hours</option>
                </select>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Analyzing..." : "Analyze Playlist"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {videoData.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Playlist Length: {totalLengthPlaylist}</CardTitle>
            </CardHeader>

            <CardContent>
              <ul className="space-y-4">
                {videoData.map((video, index) => (
                  <li key={index} className="flex items-start space-x-4">
                    <span className="font-bold text-lg min-w-[24px]">
                      {index + 1}.
                    </span>
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-24 h-auto"
                    />
                    <div>
                      <h3 className="font-semibold">{video.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formatViews(video.views)} views
                      </p>
                      <p>{video.vidLength}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 400 }}>
                {data.split("\n").map((line, index) => {
                  // Trim whitespace and check if the line contains "Day"
                  const trimmedLine = line.trim();
                  return trimmedLine ? (
                    <p key={index} style={{ margin: "0.5em 0" }}>
                      {trimmedLine}
                    </p>
                  ) : null; // Return null if the line is empty
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
