import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CashflowOperation, CashflowStats as StatsType, Debt } from "@/types/cashflow";
import { AddOperationModal } from "@/components/cashflow/AddOperationModal";
import { OperationsTable } from "@/components/cashflow/OperationsTable";
import { CashflowStats } from "@/components/cashflow/CashflowStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddDebtModal } from "@/components/cashflow/AddDebtModal";
import { DebtsTable } from "@/components/cashflow/DebtsTable";

const Cashflow = () => {
    const [operations, setOperations] = useState<CashflowOperation[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [stats, setStats] = useState<StatsType>({
        totalIn: 0,
        totalOut: 0,
        balance: 0,
    });

    useEffect(() => {
        // Fetch Operations
        const qOps = query(collection(db, "cashflow_operations"), orderBy("date", "desc"));
        const unsubscribeOps = onSnapshot(qOps, (snapshot) => {
            const ops = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as CashflowOperation[];

            setOperations(ops);
            calculateStats(ops);
        });

        // Fetch Debts
        const qDebts = query(collection(db, "debts"), orderBy("createdAt", "desc"));
        const unsubscribeDebts = onSnapshot(qDebts, (snapshot) => {
            const debtsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Debt[];
            setDebts(debtsData);
        });

        return () => {
            unsubscribeOps();
            unsubscribeDebts();
        };
    }, []);

    const calculateStats = (ops: CashflowOperation[]) => {
        const newStats = ops.reduce(
            (acc, op) => {
                if (op.type === "deposit") {
                    acc.totalIn += op.amount;
                    acc.balance += op.amount;
                } else {
                    acc.totalOut += op.amount;
                    acc.balance -= op.amount;
                }
                return acc;
            },
            { totalIn: 0, totalOut: 0, balance: 0 }
        );
        setStats(newStats);
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cashflow Management</h1>
                    <p className="text-muted-foreground">
                        Manage treasury operations and partner debts.
                    </p>
                </div>
                <div className="flex gap-2">
                    <AddDebtModal onDebtAdded={() => { }} existingDebts={debts} />
                    <AddOperationModal onOperationAdded={() => { }} />
                </div>
            </div>

            <CashflowStats stats={stats} />

            <Tabs defaultValue="operations" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="operations">Operations History</TabsTrigger>
                    <TabsTrigger value="debts">Debts Management</TabsTrigger>
                </TabsList>

                <TabsContent value="operations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Operations History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <OperationsTable operations={operations} onOperationUpdated={() => { }} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="debts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Partner Debts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DebtsTable debts={debts} onDebtUpdated={() => { }} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Cashflow;
