import type { Metadata } from "next";
import BenchmarkClient from "@/components/BenchmarkClient";
export const metadata: Metadata = { title: "FixLine benchmark — sample fault cases", description: "Measured accuracy, time to report, and estimated cost per report on a fixed set of sample faults." };
export default function Page() { return <BenchmarkClient />; }
