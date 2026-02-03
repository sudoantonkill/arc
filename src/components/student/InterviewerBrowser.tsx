import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInterviewers } from "@/hooks/useInterviewers";
import InterviewerCard from "./InterviewerCard";
import { INTERVIEW_TYPES, TARGET_COMPANIES } from "@/types/database";
import { Search, Filter, X, Users, Loader2 } from "lucide-react";

type SortOption = 'rating' | 'price_low' | 'price_high' | 'experience';

export default function InterviewerBrowser() {
    const [search, setSearch] = React.useState("");
    const [specialty, setSpecialty] = React.useState<string>("");
    const [company, setCompany] = React.useState<string>("");
    const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 200]);
    const [showFilters, setShowFilters] = React.useState(false);
    const [sortBy, setSortBy] = React.useState<SortOption>('rating');

    const { data: interviewers = [], isLoading, error } = useInterviewers({
        specialty: specialty || undefined,
        minRate: priceRange[0] * 100,
        maxRate: priceRange[1] * 100,
    });

    // Client-side filtering and sorting for search and company
    const filteredInterviewers = React.useMemo(() => {
        let result = interviewers.filter(interviewer => {
            // Search filter
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesBio = interviewer.bio?.toLowerCase().includes(searchLower);
                const matchesCompany = interviewer.company_background?.toLowerCase().includes(searchLower);
                const matchesSpecialty = interviewer.specialties?.some(s =>
                    s.toLowerCase().includes(searchLower)
                );
                if (!matchesBio && !matchesCompany && !matchesSpecialty) return false;
            }

            // Company filter
            if (company && !interviewer.company_background?.toLowerCase().includes(company.toLowerCase())) {
                return false;
            }

            return true;
        });

        // Apply sorting
        result = [...result].sort((a, b) => {
            switch (sortBy) {
                case 'rating':
                    return (b.average_rating ?? 0) - (a.average_rating ?? 0);
                case 'price_low':
                    return (a.hourly_rate_cents ?? 0) - (b.hourly_rate_cents ?? 0);
                case 'price_high':
                    return (b.hourly_rate_cents ?? 0) - (a.hourly_rate_cents ?? 0);
                case 'experience':
                    return (b.years_experience ?? 0) - (a.years_experience ?? 0);
                default:
                    return 0;
            }
        });

        return result;
    }, [interviewers, search, company, sortBy]);

    const clearFilters = () => {
        setSearch("");
        setSpecialty("");
        setCompany("");
        setPriceRange([0, 200]);
    };

    const hasActiveFilters = search || specialty || company || priceRange[0] > 0 || priceRange[1] < 200;

    return (
        <div className="space-y-6">
            {/* Search & Filter Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, company, or expertise..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className="gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="ml-1">Active</Badge>
                            )}
                        </Button>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="mt-6 pt-6 border-t space-y-6">
                            <div className="grid gap-6 md:grid-cols-3">
                                {/* Specialty Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Interview Type</label>
                                    <Select value={specialty} onValueChange={setSpecialty}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All types</SelectItem>
                                            {INTERVIEW_TYPES.map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Company Filter */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Company Experience</label>
                                    <Select value={company} onValueChange={setCompany}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All companies" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All companies</SelectItem>
                                            {TARGET_COMPANIES.map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Price Range */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Price Range: ${priceRange[0]} - ${priceRange[1]}/hr
                                    </label>
                                    <Slider
                                        value={priceRange}
                                        onValueChange={setPriceRange as (value: number[]) => void}
                                        min={0}
                                        max={200}
                                        step={10}
                                        className="mt-3"
                                    />
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="flex justify-end">
                                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                                        <X className="h-4 w-4" />
                                        Clear all filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                        {isLoading ? (
                            'Loading...'
                        ) : (
                            `${filteredInterviewers.length} interviewer${filteredInterviewers.length !== 1 ? 's' : ''} available`
                        )}
                    </span>
                </div>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="rating">Highest rated</SelectItem>
                        <SelectItem value="price_low">Price: Low to high</SelectItem>
                        <SelectItem value="price_high">Price: High to low</SelectItem>
                        <SelectItem value="experience">Most experienced</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Results Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-destructive">Failed to load interviewers</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Please try again later
                        </p>
                    </CardContent>
                </Card>
            ) : filteredInterviewers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="font-medium">No interviewers found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Try adjusting your filters or search terms
                        </p>
                        {hasActiveFilters && (
                            <Button variant="link" onClick={clearFilters} className="mt-4">
                                Clear all filters
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {filteredInterviewers.map(interviewer => (
                        <InterviewerCard key={interviewer.user_id} interviewer={interviewer} />
                    ))}
                </div>
            )}
        </div>
    );
}
