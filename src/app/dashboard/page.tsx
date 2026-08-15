import Navbar from "@/components/landing/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, Mail, Settings, Code, Package } from "lucide-react";
import Link from "next/link";

const DashboardPage = () => {
  const techStack = [
    "Next.js 15",
    "Better Auth",
    "PostgreSQL",
    "Drizzle ORM",
    "Tailwind CSS",
    "Radix UI",
    "TypeScript",
    "React Hook Form",
    "Zod",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Quick Actions */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Get started with common tasks and explore the template features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                asChild
              >
                <Link href="/dashboard/contacts">
                  <Users className="h-5 w-5" />
                  <span>Contacts</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                asChild
              >
                <Link href="/dashboard/products">
                  <Package className="h-5 w-5" />
                  <span>Products & Services</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                asChild
              >
                <Link href="/admin">
                  <Shield className="h-5 w-5" />
                  <span>Admin Panel</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                asChild
              >
                <Link
                  href="https://github.com/zexahq/better-auth-starter"
                  target="_blank"
                >
                  <Code className="h-5 w-5" />
                  <span>View Source</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex-col gap-2"
                asChild
              >
                <Link href="https://github.com/zexahq/better-auth-starter" target="_blank">
                  <Mail className="h-5 w-5" />
                  <span>Documentation</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
            <CardDescription>
              Built with modern technologies for performance, security, and
              developer experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, index) => (
                <Badge key={index} variant="outline" className="px-3 py-1">
                  {tech}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border/50">
          <p className="text-muted-foreground">
            Built with ❤️ by{" "}
            <Link
              href="https://zexa.dev"
              target="_blank"
              className="text-primary hover:underline font-medium"
            >
              Zexa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
