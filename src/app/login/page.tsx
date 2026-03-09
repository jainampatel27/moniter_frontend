'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo/Brand Section */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 group hover:scale-105 transition-transform duration-300">
                        <Lock className="w-8 h-8 text-primary group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
                    <p className="text-muted-foreground">Enter your credentials to access your account</p>
                </div>

                <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Login</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Please enter your email and password
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button className="w-full h-11 bg-white hover:bg-zinc-200 text-black font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]">
                            Sign In
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                        <div className="text-center text-sm text-zinc-400">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-white hover:underline transition-all">
                                Create one
                            </Link>
                        </div>
                    </CardFooter>
                </Card>

                {/* Decorative background elements */}
                <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                </div>
            </div>
        </div>
    );
}
