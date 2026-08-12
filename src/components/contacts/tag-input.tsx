"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { toast } from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TagInputProps {
  contactId: string;
  attachedTags: { tag: { id: string; name: string } }[];
  onTagsUpdated: () => void;
}

export function TagInput({ contactId, attachedTags, onTagsUpdated }: TagInputProps) {
  const [tagName, setTagName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: globalTagsData } = useSWR("/api/contacts/tags", fetcher);
  const globalTags: { id: string; name: string }[] = globalTagsData?.tags || [];

  const attachedTagIds = new Set(attachedTags.map((t) => t.tag.id));
  const availableTags = globalTags.filter((t) => !attachedTagIds.has(t.id));

  const handleAttachTag = async (nameToAttach: string) => {
    const cleanName = nameToAttach.trim().toLowerCase();
    if (!cleanName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to attach tag");
      }

      setTagName("");
      toast.success(`Tag "${cleanName}" attached`);
      onTagsUpdated();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetachTag = async (tagId: string, tagName: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/tags?tagId=${tagId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove tag");
      }

      toast.success(`Tag "${tagName}" removed`);
      onTagsUpdated();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 items-center min-h-[40px] p-2 border rounded-md bg-background">
        {attachedTags.length === 0 ? (
          <span className="text-xs text-muted-foreground italic px-2">No tags attached</span>
        ) : (
          attachedTags.map(({ tag }) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 text-xs py-1 px-2.5 bg-accent text-accent-foreground"
            >
              <TagIcon className="h-3 w-3" />
              {tag.name}
              <button
                onClick={() => handleDetachTag(tag.id, tag.name)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Remove tag"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add or search tag..."
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAttachTag(tagName);
            }
          }}
          className="text-sm"
        />
        <Button
          type="button"
          onClick={() => handleAttachTag(tagName)}
          disabled={!tagName.trim() || isSubmitting}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Tag
        </Button>
      </div>

      {availableTags.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Existing Tags:</span>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors text-xs"
                onClick={() => handleAttachTag(tag.name)}
              >
                + {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
