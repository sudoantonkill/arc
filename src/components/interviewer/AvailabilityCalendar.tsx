import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMyAvailability, useAddAvailabilitySlot, useDeleteAvailabilitySlot, useUpdateAvailabilitySlot } from "@/hooks/useInterviewers";
import { DAYS_OF_WEEK } from "@/types/database";
import { Plus, Trash2, Clock, Calendar } from "lucide-react";

const TIME_SLOTS = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const time = `${hour.toString().padStart(2, "0")}:${minute}`;
    return { value: `${time}:00`, label: time };
});

export default function AvailabilityCalendar() {
    const { toast } = useToast();
    const { data: slots = [], isLoading } = useMyAvailability();
    const addSlot = useAddAvailabilitySlot();
    const deleteSlot = useDeleteAvailabilitySlot();
    const updateSlot = useUpdateAvailabilitySlot();

    const [newSlot, setNewSlot] = React.useState({
        day_of_week: 1,
        start_time: "09:00:00",
        end_time: "17:00:00",
    });

    const handleAddSlot = async () => {
        try {
            await addSlot.mutateAsync(newSlot);
            toast({ title: "Availability added" });
        } catch (error) {
            toast({
                title: "Failed to add availability",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive"
            });
        }
    };

    const handleDeleteSlot = async (slotId: string) => {
        try {
            await deleteSlot.mutateAsync(slotId);
            toast({ title: "Availability removed" });
        } catch (error) {
            toast({
                title: "Failed to remove availability",
                variant: "destructive"
            });
        }
    };

    const handleToggleActive = async (slotId: string, isActive: boolean) => {
        try {
            await updateSlot.mutateAsync({
                slotId,
                day_of_week: 0, // These will be ignored
                start_time: "",
                end_time: "",
                is_active: isActive
            });
        } catch (error) {
            toast({ title: "Failed to update", variant: "destructive" });
        }
    };

    // Group slots by day
    const slotsByDay = React.useMemo(() => {
        const grouped: Record<number, typeof slots> = {};
        DAYS_OF_WEEK.forEach((_, i) => { grouped[i] = []; });
        slots.forEach(slot => {
            grouped[slot.day_of_week]?.push(slot);
        });
        return grouped;
    }, [slots]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Availability Calendar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-muted rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Availability Calendar
                </CardTitle>
                <CardDescription>
                    Set your weekly availability for interviews. Students will only be able to book during these times.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Add new slot form */}
                <div className="rounded-lg border border-dashed p-4 space-y-4">
                    <h4 className="font-medium text-sm">Add availability slot</h4>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Day</label>
                            <Select
                                value={newSlot.day_of_week.toString()}
                                onValueChange={(v) => setNewSlot(s => ({ ...s, day_of_week: parseInt(v) }))}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAYS_OF_WEEK.map((day, i) => (
                                        <SelectItem key={day} value={i.toString()}>{day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Start time</label>
                            <Select
                                value={newSlot.start_time}
                                onValueChange={(v) => setNewSlot(s => ({ ...s, start_time: v }))}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">End time</label>
                            <Select
                                value={newSlot.end_time}
                                onValueChange={(v) => setNewSlot(s => ({ ...s, end_time: v }))}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleAddSlot} disabled={addSlot.isPending}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Slot
                        </Button>
                    </div>
                </div>

                {/* Weekly schedule display */}
                <div className="grid gap-4">
                    {DAYS_OF_WEEK.map((day, dayIndex) => (
                        <div key={day} className="rounded-lg border p-4">
                            <h4 className="font-medium mb-3">{day}</h4>
                            {slotsByDay[dayIndex].length === 0 ? (
                                <p className="text-sm text-muted-foreground">No availability set</p>
                            ) : (
                                <div className="space-y-2">
                                    {slotsByDay[dayIndex].map(slot => (
                                        <div
                                            key={slot.id}
                                            className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-mono text-sm">
                                                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Active</span>
                                                    <Switch
                                                        checked={slot.is_active}
                                                        onCheckedChange={(checked) => handleToggleActive(slot.id, checked)}
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteSlot(slot.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
