"use client";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingCard } from "@/components/loading-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBudgetAlerts, useCreateAlert, useDeleteAlert, useUpdateAlert } from "@/lib/hooks";
import { Bell, DollarSign, Plus, Trash2 } from "lucide-react";
import { BellOff } from "lucide-react";
import { useState } from "react";

export default function AlertsPage() {
  const { data, isLoading, isError, error, refetch } = useBudgetAlerts();
  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();

  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newType, setNewType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [newThreshold, setNewThreshold] = useState(25);

  const alerts = data?.alerts ?? [];

  const handleCreate = () => {
    createAlert.mutate(
      {
        type: newType,
        thresholdUsd: newThreshold,
        channels: {},
        enabled: true,
      },
      {
        onSuccess: () => {
          setShowNewAlert(false);
          setNewType("daily");
          setNewThreshold(25);
        },
      },
    );
  };

  const handleToggle = (id: string, currentEnabled: boolean) => {
    updateAlert.mutate({ id, enabled: !currentEnabled });
  };

  const handleDelete = (id: string) => {
    deleteAlert.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Alerts</h1>
        <p className="text-muted-foreground">Configure spending alerts and notifications</p>
      </div>

      {isError && (
        <ErrorState message={error?.message || "Failed to load alerts"} onRetry={() => refetch()} />
      )}

      {/* Summary */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.filter((a) => a.enabled).length}</div>
              <p className="text-xs text-muted-foreground">of {alerts.length} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alert Types</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {["daily", "weekly", "monthly"].map((t) => {
                  const count = alerts.filter((a) => a.type === t).length;
                  return count > 0 ? (
                    <Badge key={t} variant="outline">
                      {t}: {count}
                    </Badge>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Budget Alerts</CardTitle>
            <CardDescription>
              Set spending thresholds and get notified when exceeded
            </CardDescription>
          </div>
          <Dialog open={showNewAlert} onOpenChange={setShowNewAlert}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Budget Alert</DialogTitle>
                <DialogDescription>Configure a new spending threshold alert</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={newType}
                    onValueChange={(v: "daily" | "weekly" | "monthly") => setNewType(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="threshold">Threshold (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="threshold"
                      type="number"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(Number.parseFloat(e.target.value))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewAlert(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createAlert.isPending || newThreshold <= 0}
                >
                  {createAlert.isPending ? "Creating..." : "Create Alert"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {alert.type}
                      </Badge>
                    </TableCell>
                    <TableCell>${alert.thresholdUsd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={() => handleToggle(alert.id, alert.enabled)}
                        disabled={updateAlert.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(alert.id)}
                        disabled={deleteAlert.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={BellOff}
              title="No Budget Alerts"
              description="Create your first alert to get notified when AI spending exceeds a threshold."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
