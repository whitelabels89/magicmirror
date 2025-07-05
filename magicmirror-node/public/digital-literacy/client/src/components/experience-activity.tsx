import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StudentProgress } from "@shared/schema";

interface ExperienceActivityProps {
  studentName: string;
  progress: StudentProgress;
}

export default function ExperienceActivity({ studentName, progress }: ExperienceActivityProps) {
  const [favoriteDevice, setFavoriteDevice] = useState("");
  const [deviceUsage, setDeviceUsage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitExperienceMutation = useMutation({
    mutationFn: async (experienceData: { favoriteDevice: string; deviceUsage: string }) => {
      const response = await apiRequest('POST', `/api/experience/${studentName}`, { experienceData });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      toast({
        title: "Thank you for sharing! 💭",
        description: "Your experience has been saved! You earned 15 points.",
        className: "bg-green-500 text-white",
      });
      
      // Clear form
      setFavoriteDevice("");
      setDeviceUsage("");
    },
  });

  const handleSubmit = () => {
    const favoriteDeviceTrimmed = favoriteDevice.trim();
    const deviceUsageTrimmed = deviceUsage.trim();

    if (!favoriteDeviceTrimmed || !deviceUsageTrimmed) {
      toast({
        title: "Please fill in both fields! 📝",
        description: "Make sure to tell us about your favorite device and how you use it.",
        variant: "destructive",
      });
      return;
    }

    submitExperienceMutation.mutate({
      favoriteDevice: favoriteDeviceTrimmed,
      deviceUsage: deviceUsageTrimmed,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-fredoka text-lg text-gray-800 mb-2">Share Your Experience</h4>
        <p className="text-gray-600 mb-4">Tell us about your favorite digital device!</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label htmlFor="favorite-device" className="text-sm font-medium text-gray-700">
              What's your favorite digital device?
            </Label>
            <Input
              id="favorite-device"
              value={favoriteDevice}
              onChange={(e) => setFavoriteDevice(e.target.value)}
              placeholder="e.g., Tablet, Smartphone..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="device-usage" className="text-sm font-medium text-gray-700">
              What do you do with it?
            </Label>
            <Textarea
              id="device-usage"
              value={deviceUsage}
              onChange={(e) => setDeviceUsage(e.target.value)}
              placeholder="Tell us what you like to do with your favorite device..."
              rows={4}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitExperienceMutation.isPending}
        className="w-full"
      >
        {submitExperienceMutation.isPending ? "Sharing..." : "Share My Experience"}
      </Button>
    </div>
  );
}
