import { Rubik } from 'next/font/google'

import navigation from './navigation'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import clsx from 'clsx'

import packageInfo from '../../../../package.json';
import { FilePlus, FileSearch, MenuIcon, Plus, XIcon } from 'lucide-react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Button } from '../../ui/button'
import { invoke } from '@tauri-apps/api/tauri'

const rubik = Rubik({
    variable: "--font-rubik",
    subsets: ["latin"],
    weight: "variable"
});


const Sidebar = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { pathname } = useRouter();

    const currentNavigation = navigation.map((item) => {
        if (item.href === pathname) {
            return { ...item, current: true }
        }
        return { ...item, current: false }
    });

    const currentPage = currentNavigation.find((item) => item.current);

    return (
        <>
            <Transition.Root show={sidebarOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-900/80" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex">
                        <Transition.Child
                            as={Fragment}
                            enter="transition ease-in-out duration-300 transform"
                            enterFrom="-translate-x-full"
                            enterTo="translate-x-0"
                            leave="transition ease-in-out duration-300 transform"
                            leaveFrom="translate-x-0"
                            leaveTo="-translate-x-full"
                        >
                            <Dialog.Panel className={clsx(rubik.variable, "font-sans relative mr-16 flex w-full max-w-xs flex-1")}>
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-in-out duration-300"
                                    enterFrom="opacity-0"
                                    enterTo="opacity-100"
                                    leave="ease-in-out duration-300"
                                    leaveFrom="opacity-100"
                                    leaveTo="opacity-0"
                                >
                                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                                        <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                                            <span className="sr-only">Close sidebar</span>
                                            <XIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                        </button>
                                    </div>
                                </Transition.Child>
                                {/* Sidebar component, swap this element with another sidebar if you like */}
                                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 py-6 ring-1 ring-white/10">
                                    <div className="flex h-16 shrink-0 items-center">
                                        <span>{packageInfo.displayName}</span>
                                    </div>
                                    <nav className="flex flex-1 flex-col">
                                        <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                            <li>
                                                <ul role="list" className="-mx-2 space-y-1">
                                                    {currentNavigation.map((item) => (
                                                        <li key={item.name}>
                                                            <Link
                                                                href={item.href}
                                                                className={clsx(
                                                                    item.current
                                                                        ? 'bg-gray-800 text-white'
                                                                        : 'text-gray-400 hover:text-white hover:bg-gray-800',
                                                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                                                                )}
                                                                onClick={() => setSidebarOpen(false)}
                                                            >
                                                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                                {item.name}
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        </ul>
                                    </nav>
                                    <div className="flex flex-col gap-2">
                                        <Button variant="secondary" size="sm" onClick={handle_create_project}><FilePlus className="mr-2 h-4 w-4" /> New Project</Button>
                                        <Button variant="default" size="sm" onClick={handle_open_project}><FileSearch className="mr-2 h-4 w-4" /> Open Project</Button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition.Root>

            {/* Static sidebar for desktop */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                {/* Sidebar component, swap this element with another sidebar if you like */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 py-6">
                    <div className="flex h-16 shrink-0 items-center">
                        <span>{packageInfo.displayName}</span>
                    </div>
                    <nav className="flex flex-1 flex-col">
                        <ul role="list" className="flex flex-1 flex-col gap-y-7">
                            <li>
                                <ul role="list" className="-mx-2 space-y-2">
                                    {currentNavigation.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={clsx(
                                                    item.current
                                                        ? 'bg-gray-800 text-white'
                                                        : 'text-gray-400 hover:text-white hover:bg-gray-800',
                                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                                                )}
                                            >
                                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        </ul>
                    </nav>
                    <div className="flex flex-col gap-2">
                        <Button variant="secondary" size="sm" onClick={handle_create_project}><FilePlus className="mr-2 h-4 w-4" /> New Project</Button>
                        <Button variant="default" size="sm" onClick={handle_open_project}><FileSearch className="mr-2 h-4 w-4" /> Open Project</Button>
                    </div>
                </div>
            </div>

            <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
                <button type="button" className="-m-2.5 p-2.5 text-gray-400 lg:hidden" onClick={() => setSidebarOpen(true)}>
                    <span className="sr-only">Open sidebar</span>
                    <MenuIcon className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="flex-1 text-sm font-semibold leading-6 text-white">{currentPage?.name ?? packageInfo.displayName} </div>
            </div></>
    );
}

export default Sidebar

const { filetypeAssociation } = packageInfo;

const handle_create_project = async () => {
    const dialog = await import("@tauri-apps/api/dialog");

    const result = await dialog.save({
        filters: [{
            name: `${filetypeAssociation.name} Project`,
            extensions: filetypeAssociation.extensions
        }]
    })

    if (result) {
        await invoke("open_project", { path: result }).catch(err => {
            dialog.message(err, { type: "error", title: "Something went wrong" })
        })
    }
}

const handle_open_project = async () => {
    const dialog = await import("@tauri-apps/api/dialog");

    const result = await dialog.open({
        filters: [{
            name: `${filetypeAssociation.name} Project`,
            extensions: filetypeAssociation.extensions
        }]
    })

    if (result) {
        await invoke("open_project", { path: result }).catch(err => {
            dialog.message(err, { type: "error", title: "Something went wrong" })
        })
    }
}